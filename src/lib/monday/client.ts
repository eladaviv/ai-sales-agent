import type { BoardConfig, BoardItem, MondayBoardCreationResult } from "@/types";
import { MONDAY_COLUMN_IDS } from "@/constants";

const MONDAY_API_URL = "https://api.monday.com/v2";

// ─── GraphQL helper ───────────────────────────────────────────────────────────
async function mondayQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const apiKey = process.env.MONDAY_API_KEY;
  if (!apiKey) throw new Error("MONDAY_API_KEY environment variable not set");

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": apiKey,
      "API-Version":   "2024-01",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Monday API HTTP ${res.status}`);

  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (json.errors?.length) {
    throw new Error(`Monday API error: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  return json.data as T;
}

// ─── Create board ─────────────────────────────────────────────────────────────
async function createBoard(name: string): Promise<{boardId: string, boardUrl: string}> {
  // i wanted to use share board kind, but i don't have permissions
  const query = `
    mutation CreateBoard($name: String!) {
      create_board(board_name: $name, board_kind: public) {
        id,
        url
      }
    }
  `;

  const data = await mondayQuery<{ create_board: { id: string, url: string } }>(query, { name });
  return { boardId: data.create_board.id, boardUrl: data.create_board.url };
}

// ─── Create group within board ────────────────────────────────────────────────
async function createGroup(boardId: string, groupName: string): Promise<string> {
  const query = `
    mutation CreateGroup($boardId: ID!, $groupName: String!) {
      create_group(board_id: $boardId, group_name: $groupName) {
        id
      }
    }
  `;

  const data = await mondayQuery<{ create_group: { id: string } }>(query, {
    boardId,
    groupName,
  });

  return data.create_group.id;
}

// ─── Create item within group ─────────────────────────────────────────────────
function buildColumnValues(item: BoardItem): string {
  const cols: Record<string, unknown> = {
    [MONDAY_COLUMN_IDS.status]:   { label: item.status },
    [MONDAY_COLUMN_IDS.priority]: { label: item.priority },
  };
  return JSON.stringify(cols);
}

async function createItem(
  boardId: string,
  groupId: string,
  item: BoardItem,
): Promise<string> {
  const query = `
    mutation CreateItem($boardId: ID!, $groupId: String!, $name: String!, $cols: JSON!) {
      create_item(
        board_id:      $boardId,
        group_id:      $groupId,
        item_name:     $name,
        column_values: $cols
      ) {
        id
      }
    }
  `;

  const data = await mondayQuery<{ create_item: { id: string } }>(query, {
    boardId,
    groupId,
    name: item.name,
    cols: buildColumnValues(item),
  });

  return data.create_item.id;
}

// ─── Main: create full board from config ──────────────────────────────────────
export async function createMondayBoard(
  config: BoardConfig,
): Promise<MondayBoardCreationResult> {
  try {
    // 1. Create the board
    const {boardId, boardUrl} = await createBoard(config.boardName);

    // 2. Create all groups and map name → id
    const groupMap: Record<string, string> = {};
    for (const groupName of config.groups) {
      const groupId = await createGroup(boardId, groupName);
      groupMap[groupName] = groupId;
    }

    // 3. Create all items in their respective groups
    let itemsCreated = 0;
    for (const item of config.sampleItems) {
      const groupId = groupMap[item.group];
      if (!groupId) continue;
      await createItem(boardId, groupId, item);
      itemsCreated++;
    }

    return {
      boardId,
      boardUrl,
      itemsCreated,
      success: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Monday API]", message);

    return {
      boardId:      "",
      boardUrl:     "",
      itemsCreated: 0,
      success:      false,
      error:        message,
    };
  }
}
