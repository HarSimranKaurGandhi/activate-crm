CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description LONGTEXT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    due_date DATE NULL,
    assigned_to BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT tasks_assigned_to_foreign
        FOREIGN KEY (assigned_to) REFERENCES users(id)
        ON DELETE SET NULL
);
