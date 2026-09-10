import { LiveProvider, LivePreview as ReactLivePreview, LiveError } from 'react-live';

interface LivePreviewProps {
  code: string;
}

export function LivePreview({ code }: LivePreviewProps) {
  return (
    <LiveProvider code={code} noInline>
      <div className="stage">
        <ReactLivePreview />
      </div>
      <LiveError className="stage-error" />
    </LiveProvider>
  );
}
