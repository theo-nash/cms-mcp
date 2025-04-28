# Content Management System Integration Guide

## Overview

This guide explains how to integrate with the Content Management System (CMS) using either the REST API or the MCP SDK.

## REST API Integration

### Authentication

All API requests require an API key to be included in the `Authorization` header:

```bash
Authorization: Bearer YOUR_API_KEY
```

### Base URL

```
https://your-cms-domain.com/api/v1
```

### Example: Creating a Campaign

#### Using cURL

```bash
curl -X POST \
  https://your-cms-domain.com/api/v1/campaigns \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Summer Campaign 2024",
    "description": "Summer promotional campaign",
    "startDate": "2024-06-01T00:00:00Z",
    "endDate": "2024-08-31T23:59:59Z",
    "objectives": ["Increase brand awareness", "Drive summer sales"]
  }'
```

#### Using TypeScript/JavaScript

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "https://your-cms-domain.com/api/v1",
  headers: {
    Authorization: `Bearer YOUR_API_KEY`,
  },
});

async function createCampaign() {
  try {
    const response = await api.post("/campaigns", {
      name: "Summer Campaign 2024",
      description: "Summer promotional campaign",
      startDate: "2024-06-01T00:00:00Z",
      endDate: "2024-08-31T23:59:59Z",
      objectives: ["Increase brand awareness", "Drive summer sales"],
    });
    console.log("Campaign created:", response.data);
  } catch (error) {
    console.error("Error creating campaign:", error);
  }
}
```

#### Using Python

```python
import requests

API_KEY = 'YOUR_API_KEY'
BASE_URL = 'https://your-cms-domain.com/api/v1'

def create_campaign():
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }

    data = {
        'name': 'Summer Campaign 2024',
        'description': 'Summer promotional campaign',
        'startDate': '2024-06-01T00:00:00Z',
        'endDate': '2024-08-31T23:59:59Z',
        'objectives': ['Increase brand awareness', 'Drive summer sales']
    }

    response = requests.post(f'{BASE_URL}/campaigns', json=data, headers=headers)
    return response.json()
```

## MCP SDK Integration

### Installation

```bash
npm install @modelcontextprotocol/sdk
```

### Example: Using the MCP Client

```typescript
import { McpClient } from "@modelcontextprotocol/sdk/client";

async function main() {
  const client = new McpClient({
    serverUrl: "your-mcp-server-url",
  });

  // Create a campaign
  const result = await client.invoke("createCampaign", {
    name: "Summer Campaign 2024",
    description: "Summer promotional campaign",
    startDate: "2024-06-01T00:00:00Z",
    endDate: "2024-08-31T23:59:59Z",
    objectives: ["Increase brand awareness", "Drive summer sales"],
  });

  console.log("Campaign created:", result);
}
```

## API Documentation

Full API documentation is available at `/api-docs` when running the server locally.
