import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const Docs: NextPage = () => {
  // Serve Swagger UI with our OpenAPI schema
  return <SwaggerUI url="/api/openapi.json" />;
};

export default Docs;
