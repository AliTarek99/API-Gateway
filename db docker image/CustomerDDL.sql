CREATE TABLE Users(
    id SERIAL NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    type VARCHAR(15) NOT NULL
);
CREATE INDEX users_email_password_index ON
    Users (email) INCLUDE (password, id, type);
ALTER TABLE
    Users ADD PRIMARY KEY(id);
CREATE TABLE dummy(
    id SERIAL NOT NULL,
    text TEXT NOT NULL
);
ALTER TABLE
    dummy ADD PRIMARY KEY(id);