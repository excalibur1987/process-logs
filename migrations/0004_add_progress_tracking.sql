-- Create function_progress_tracking table
CREATE TABLE IF NOT EXISTS function_progress_tracking (
    id SERIAL PRIMARY KEY NOT NULL,
    func_id INTEGER NOT NULL,
    prog_id VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    current_value NUMERIC NOT NULL,
    max_value NUMERIC NOT NULL,
    duration NUMERIC,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_function_progress_tracking_func_id_function_progress
        FOREIGN KEY (func_id)
        REFERENCES function_progress(func_id)
        ON DELETE CASCADE
);

-- Create index on prog_id and func_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_function_progress_tracking_prog_id
    ON function_progress_tracking(prog_id);

CREATE INDEX IF NOT EXISTS idx_function_progress_tracking_func_id
    ON function_progress_tracking(func_id);

-- Create unique constraint on func_id and prog_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_function_progress_tracking_unique_prog
    ON function_progress_tracking(func_id, prog_id); 