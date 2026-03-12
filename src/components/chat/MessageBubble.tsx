import type { ChatMessage } from "@/types";
import { BoardPreview } from "@/components/board/BoardPreview";
import { PaymentCard }  from "@/components/payment/PaymentCard";

interface MessageBubbleProps {
  message: ChatMessage;
  name:    string; // prospect first name
}

export function MessageBubble({ message, name }: MessageBubbleProps) {
  const isAgent = message.role === "assistant";

  return (
    <div className={`message${isAgent ? "" : " message--user"}`}>
      {/* Avatar */}
      <div className={`message__avatar message__avatar--${isAgent ? "agent" : "user"}`}>
        {isAgent ? "✨" : "👤"}
      </div>

      {/* Body */}
      <div className="message__body">
        <div className={`message__label message__label--${isAgent ? "agent" : "user"}`}>
          {isAgent ? "Maya" : name}
        </div>

        {/* Text bubble */}
        {message.content && (
          <div className={`message__bubble message__bubble--${isAgent ? "agent" : "user"}`}>
            {message.content}
          </div>
        )}

        {/* Board preview — injected when tool returns a board config */}
        {message.boardConfig && (
          <BoardPreview
            config={message.boardConfig}
            mondayResult={message.mondayResult}
          />
        )}

        {/* Payment card — injected when tool triggers payment */}
        {message.paymentTrigger && (
          <PaymentCard trigger={message.paymentTrigger} />
        )}
      </div>
    </div>
  );
}
