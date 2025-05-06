# Weather API

## Overview

Weather API is a RESTful service that allows you to manage cities and retrieve weather information for them. The API connects to the OpenWeatherMap service to fetch current and historical weather data.

This project is built with:

- NestJS and TypeScript
- Prisma ORM with PostgreSQL
- Swagger API documentation
- Docker for containerized deployment

## Features

- Manage cities through a REST API (create, read, delete)
- Retrieve current weather data for cities
- Get historical weather data (last 7 days) for specific cities
- Hourly scheduled updates of weather data for all cities
- API documentation with Swagger
- Docker and Docker Compose support for easy deployment

### Caching Layer

- **Redis-powered Caching**: Implementation of Redis for high-performance, in-memory caching of weather data, reducing external API calls and improving response times
- **TTL-based Cache Management**: Weather data is cached with configurable time-to-live settings based on data volatility (e.g., current weather vs. historical data)
- **Smart Invalidation Strategy**: Automatic cache invalidation when fresh weather data is received from scheduled updates, ensuring data accuracy while maintaining performance
- **Comprehensive Cache Analytics**: Real-time monitoring of cache hit/miss ratios, latency improvements, and storage utilization to continuously optimize caching policies

### Advanced Error Handling & Resilience

- **Circuit Breaker Implementation**: Integration of the circuit breaker pattern that automatically detects OpenWeatherMap API failures and prevents cascading system failures
- **Intelligent Retry Strategy**: Configurable retry mechanism with exponential backoff and jitter to gracefully handle transient network or API issues
- **Multi-tiered Fallback System**:
  - Primary: Attempt to retrieve from cache
  - Secondary: Fallback to alternative weather providers when primary source is unavailable
  - Tertiary: Return last known good data with appropriate staleness indicators
- **Comprehensive Error Telemetry**: Structured error logging with contextual information, error classification, and integration with monitoring systems for proactive issue detection

## Database Structure

The application uses two main models:

1. **City** - Stores city information

   - id: Unique identifier
   - name: City name (unique)
   - weatherData: Optional relation to WeatherData

2. **WeatherData** - Stores weather information for cities

   - id: Unique identifier
   - timestamp: When the data was recorded
   - temp: Temperature in celsius
   - feels_like: Feels like temperature
   - humidity: Humidity percentage
   - mainData: Additional weather data in JSON format
   - cityId: Related city

## API Endpoints

| Method | Endpoint                | Description                                                  |
| ------ | ----------------------- | ------------------------------------------------------------ |
| GET    | `/cities`               | Get all cities with their latest basic weather data          |
| POST   | `/cities`               | Create a new city and retrieve its current weather           |
| DELETE | `/cities/:id`           | Delete a city and its weather data                           |
| GET    | `/cities/weather`       | Get complete weather data for all cities                     |
| GET    | `/cities/:name/weather` | Get weather data for a specific city including 7-day history |

## Setup Instructions

### Prerequisites

- Node.js (v22+)
- Docker and Docker Compose
- OpenWeatherMap API key

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/weather-api?schema=public"

# Server
PORT=3000

# OpenWeatherMap
OPENWEATHERMAP_API_KEY=your_api_key_here
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev
```

## Running the Application

### Development Mode

```bash
# Run in development mode
npm run start:dev
```

```bash
# Run in development mode with database and redis
npm run start:db+dev
```

### Production Mode

```bash
# Build for production
npm run build

# Run in production mode
npm run start:prod
```

### Using Docker Compose

The application includes a complete Docker setup for easy deployment.

#### Prerequisites

- Docker and Docker Compose installed on your machine
- An OpenWeather API key in your `.env` file

#### Configuration

Make sure your `.env` file is properly configured:

- `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` for the database
- `OPENWEATHER_API_KEY` for the weather data

#### Deployment Commands

```bash
# Build and start the application and database
docker compose up -d --build

# View logs
docker compose logs -f

# Stop the application
docker compose down

# Rebuild and restart
docker compose up -d --build
```

#### What's Included

The Docker setup includes:

- **API Service**: NestJS application with automatic migrations
- **Database Service**: PostgreSQL with volume persistence
- Health checks to ensure the database is ready before starting the API

The API will be available at http://localhost:3000 once deployed.

## Accessing Swagger Documentation

After starting the application, you can access the Swagger documentation at:

```
http://localhost:3000/api
```

## Weather Data Integration

### Provider Architecture

The application features a comprehensive and flexible weather provider switching system based on SOLID principles:

- **Modular Provider Design**: Abstract base class architecture allows for seamless provider switching
- **Configuration-driven Selection**: Weather providers can be switched through simple configuration changes without code modification
- **Currently Supported Providers**:
  - OpenWeatherMap API v2.5
  - OpenWeatherMap API v3.0 (with enhanced data features)
- **Common Provider Base**: Shared functionality across providers to minimize code duplication
- **Standardized Units System**: Consistent units handling (metric, imperial, standard) across all providers

### API Integration

The application uses the following OpenWeatherMap APIs:

- Current Weather Data API for real-time weather information
- One Call API 3.0 with day_summary feature for historical daily weather data

The system automatically handles API errors and rate limits, providing a resilient interface to weather data.

## License

This project is licensed under the MIT License.
