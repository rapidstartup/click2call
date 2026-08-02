import { useParams } from 'react-router-dom';

import CallWidget from '../components/CallWidget';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EmbedWidgetPage = () => {
  const { widgetId } = useParams<{ widgetId: string }>();
  if (!widgetId || !UUID_PATTERN.test(widgetId)) {
    return <p className="p-4 text-sm text-red-700">This Click2Call widget link is invalid.</p>;
  }

  return (
    <main className="min-h-screen bg-transparent p-2">
      <CallWidget acceptParentChallenge widgetId={widgetId} />
    </main>
  );
};

export default EmbedWidgetPage;
