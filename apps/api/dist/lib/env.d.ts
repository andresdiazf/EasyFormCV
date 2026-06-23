export declare const env: {
    readonly API_PORT: number;
    readonly API_HOST: string;
    /**
     * PostgreSQL connection string.
     * Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`
     * Get this from Supabase → Project Settings → Database → Connection String.
     */
    readonly DATABASE_URL: string;
    /**
     * Base URL of the Python pdf-parser FastAPI microservice.
     * In production, this is the public Render URL of the pdf-parser Web Service.
     */
    readonly PDF_PARSER_URL: string;
    /**
     * Base URL of the Python browser-automation FastAPI microservice.
     * In production, this is the public Render URL of the browser-automation Web Service.
     */
    readonly BROWSER_AUTOMATION_URL: string;
    readonly NODE_ENV: string;
    /**
     * Optional OpenAI API key — enables AI-assisted field mapping.
     * Never log this value. Store it only in `.env` locally or in Render's
     * Secret Environment settings in production.
     */
    readonly OPENAI_API_KEY: string | undefined;
};
//# sourceMappingURL=env.d.ts.map