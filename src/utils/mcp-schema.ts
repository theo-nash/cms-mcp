import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

export class McpSchemaBuilder {
    /**
     * Convert a Zod schema to a clean JSON schema for MCP tools
     */
    static buildFromZod(zodSchema: z.ZodType<any>): object {
        // Convert the schema
        const schema = zodToJsonSchema(zodSchema, {
            $refStrategy: "none",
            dateStrategy: "format:date-time"
        });

        // Remove $schema property
        const { $schema, ...cleanSchema } = schema;

        // Fix date fields to be more LLM-friendly
        return this.fixDateFields(cleanSchema);
    }

    /**
     * Fix any problematic date fields in the schema
     */
    private static fixDateFields(schema: any): any {
        // Deep clone to avoid modifying the original
        const result = JSON.parse(JSON.stringify(schema));

        // Process all properties
        if (result.properties) {
            // Fix top-level date fields
            for (const [key, value] of Object.entries(result.properties)) {
                // Look for date-related fields
                if (key.toLowerCase().includes('date') && (value as any).anyOf) {
                    result.properties[key] = {
                        type: "string",
                        format: "date-time",
                        description: `${(value as any).description || key} (ISO format, e.g. "2025-05-01T12:00:00Z")`
                    };
                }
                // Look for arrays that might contain date fields (like majorMilestones)
                if ((value as any).type === "array" && (value as any).items && (value as any).items.properties) {
                    // Check for date properties in array items
                    for (const [itemKey, itemValue] of Object.entries((value as any).items.properties)) {
                        if (itemKey.toLowerCase().includes('date') && (itemValue as any).anyOf) {
                            (value as any).items.properties[itemKey] = {
                                type: "string",
                                format: "date-time",
                                description: `${(itemValue as any).description || itemKey} (ISO format, e.g. "2025-05-01T12:00:00Z")`
                            };
                        }
                    }
                }
                // Handle nested objects recursively
                if ((value as any).type === "object" && (value as any).properties) {
                    result.properties[key] = this.fixDateFields(value);
                }
            }
        }

        return result;
    }
}