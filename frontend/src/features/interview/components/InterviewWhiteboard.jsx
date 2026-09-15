import Whiteboard from '../../../components/Whiteboard';

/**
 * InterviewWhiteboard — thin wrapper around the existing Whiteboard component.
 */
export function InterviewWhiteboard({ workspaceId, onActivity }) {
  return (
    <div className="h-full w-full min-h-0 flex-1 flex flex-col">
      <Whiteboard workspaceId={workspaceId} onActivity={onActivity} />
    </div>
  );
}

export default InterviewWhiteboard;
