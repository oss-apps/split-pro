import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const Docs: NextPage = () => {
  const theme = useTheme();
  theme.setTheme('light');
  return <SwaggerUI url="/api/openapi.json" />;
};

export default Docs;
