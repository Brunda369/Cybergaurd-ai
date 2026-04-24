# Cyberguard AI

Cyberguard AI is a comprehensive platform designed to provide advanced monitoring, incident detection, and response capabilities for modern applications. It integrates various services such as Temporal workflows, Hasura GraphQL engine, and machine learning models to deliver a robust and scalable solution.

## Features
- **Temporal Workflows**: Orchestrate complex workflows with Temporal.
- **GraphQL API**: Powered by Hasura for real-time data queries and mutations.
- **Machine Learning Models**: Predictive models for scoring and decision-making.
- **Event Monitoring**: Monitor and respond to application events.
- **Dockerized Services**: All components are containerized for easy deployment.

## Prerequisites
Before you begin, ensure you have the following installed on your system:
- Docker and Docker Compose
- Node.js and npm
- Python 3.8+
- Git

## Installation

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Brunda369/Cybergaurd-ai.git
   cd Cybergaurd-ai
   ```

2. **Set Up Environment Variables**:
   - Create a `.env` file in the `temporal` directory and populate it with the required environment variables.
   - Example:
     ```env
     GROQ_API_KEY=your-api-key
     HASURA_ADMIN_SECRET=your-admin-secret
     ```

3. **Build and Start Services**:
   Use Docker Compose to build and start all services:
   ```bash
   docker-compose up --build
   ```

4. **Access the Services**:
   - Temporal UI: [http://localhost:8080](http://localhost:8080)
   - Hasura Console: [http://localhost:8081](http://localhost:8081)
   - Model Service: [http://localhost:8000](http://localhost:8000)
   - Trigger Webhook: [http://localhost:3000](http://localhost:3000)

## Usage

1. **Temporal Workflows**:
   - Define workflows in the `temporal/src/workflows` directory.
   - Start the Temporal worker to execute workflows:
     ```bash
     cd temporal
     npm run dev
     ```

2. **GraphQL API**:
   - Use the Hasura Console to manage your GraphQL schema and queries.
   - Example query:
     ```graphql
     query GetUsers {
       users {
         id
         name
       }
     }
     ```

3. **Machine Learning Models**:
   - Place your models in the `model_service/models` directory.
   - Use the `/predict` endpoint to make predictions.

4. **Event Monitoring**:
   - Trigger events using the `trigger-webhook` service.
   - Example:
     ```bash
     curl -X POST http://localhost:3000/events -d '{"event": "example"}'
     ```

## Testing

- **Unit Tests**:
  Run unit tests for the Temporal workflows:
  ```bash
  cd temporal
  npm test
  ```

- **Integration Tests**:
  Test the model service:
  ```bash
  cd model_service
  python test_integration.py
  ```

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Support

If you encounter any issues, please open an issue on the [GitHub repository](https://github.com/Brunda369/Cybergaurd-ai/issues).
