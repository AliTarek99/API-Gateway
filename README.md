![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

# API Gateway Documentation

## Overview
The API Gateway is designed to route requests based on user types. It distinguishes between customer and company users to serve their requests from appropriate databases. 

- **Customer Users:** Requests are served by the primary customer database.
- **Company Users:** Requests are routed to a specific company database for full isolation.

## Endpoint Documentation
Comprehensive API endpoint documentation is available [here](https://documenter.getpostman.com/view/33536415/2sA3s1os8d).

## Database Schema

### Company Database
![Company Database Schema](https://github.com/user-attachments/assets/3b2ea592-6403-4a3c-a5c1-90b630b50220)

#### Users Table
- **Primary Index:** On `user_id` to optimize searches by user ID.
- **Secondary Index:** On `email`, including `password`, `type`, and `id`. This index supports efficient login operations by allowing index-only scans without accessing the tuple.

### Customer Database
![Customer Database Schema](https://github.com/user-attachments/assets/01c8fc3a-c6f8-41d4-bc1b-48305912db57)

## Technologies
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma

## Usage
- Ensure the API Gateway is properly configured to route requests based on user type.
- Consult the endpoint documentation for detailed information on API endpoints and request handling.
