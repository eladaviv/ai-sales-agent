import type { BoardConfig, MondayBoardCreationResult } from "@/types";
import { STATUS_COLORS, PRIORITY_COLORS } from "@/constants";
import { Tag, Label } from "@/components/shared/Atoms";

interface BoardPreviewProps {
  config:       BoardConfig;
  mondayResult?: MondayBoardCreationResult;
}

export function BoardPreview({ config, mondayResult }: BoardPreviewProps) {
  return (
    <div className="board-preview">
      {/* Header */}
      <div className="board-preview__header">
        <span style={{ fontSize: 16 }}>📋</span>
        <span className="board-preview__header-name">{config.boardName}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {mondayResult?.success ? (
            <Tag variant="green">⚡ Live in monday.com</Tag>
          ) : (
            <Tag variant="blue">Preview</Tag>
          )}
          <Tag variant="blue">AI Generated</Tag>
        </div>
      </div>

      {/* Column headers */}
      <div className="board-preview__cols">
        <div className="board-preview__col-label">Task</div>
        <div className="board-preview__col-label">Status</div>
        <div className="board-preview__col-label">Priority</div>
      </div>

      {/* Groups + items */}
      {config.groups.map((group, gi) => {
        const groupItems = config.sampleItems.filter((item) => item.group === group);
        if (groupItems.length === 0) return null;

        const groupColor = ["var(--blue)", "var(--green)", "var(--amber)", "var(--purple)"][gi % 4];

        return (
          <div key={group}>
            {/* Group header */}
            <div
              className="board-preview__group-header"
              style={{
                borderLeftColor: groupColor,
                background:      `${groupColor.replace("var(", "").replace(")", "")}08`,
                color:            groupColor,
              }}
            >
              {group}
            </div>

            {/* Items */}
            {groupItems.map((item, ii) => {
              const statusColor   = STATUS_COLORS[item.status]   ?? "var(--text-muted)";
              const priorityColor = PRIORITY_COLORS[item.priority] ?? "var(--text-muted)";

              return (
                <div key={`${group}-${ii}`} className="board-preview__item">
                  <span className="board-preview__item-name">{item.name}</span>

                  <span
                    className="board-preview__badge"
                    style={{
                      background: `${statusColor}22`,
                      color:       statusColor,
                    }}
                  >
                    {item.status}
                  </span>

                  <span
                    className="board-preview__badge"
                    style={{
                      background: `${priorityColor}22`,
                      color:       priorityColor,
                    }}
                  >
                    {item.priority}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* Monday.com live link */}
      {mondayResult?.success && mondayResult.boardUrl && (
        <div className="monday-result">
          <span style={{ color: "var(--green)" }}>✓</span>
          <span>
            Board created in monday.com —{" "}
            <a href={mondayResult.boardUrl} target="_blank" rel="noopener noreferrer">
              Open board ↗
            </a>
            {" "}({mondayResult.itemsCreated} items)
          </span>
        </div>
      )}

      {/* Error fallback */}
      {mondayResult && !mondayResult.success && (
        <div
          style={{
            padding:   "8px 14px",
            fontSize:  11,
            color:     "var(--text-muted)",
            fontFamily: "var(--mono)",
          }}
        >
          ⚠ Board preview only — connect MONDAY_API_KEY to create live boards
        </div>
      )}
    </div>
  );
}
