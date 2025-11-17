
DROP TABLE IF EXISTS exercise_logs;
DROP TABLE IF EXISTS routine_exercises;
DROP TABLE IF EXISTS routines;
DROP TABLE IF EXISTS workout_sessions;
DROP TABLE IF EXISTS exercises;

CREATE TABLE exercises (
    exercise_id serial PRIMARY KEY,
    exercise_name varchar(100) NOT NULL,
    category varchar(50),
    user_id varchar(100) DEFAULT NULL, 
    UNIQUE(user_id, exercise_name)
);

CREATE TABLE workout_sessions (
    session_id serial PRIMARY KEY,
    user_id varchar(100) NOT NULL, 
    session_date timestamptz DEFAULT CURRENT_TIMESTAMP,
    session_title varchar(100),
    notes text
);

CREATE TABLE exercise_logs (
    log_id serial PRIMARY KEY,
    session_id int NOT NULL,
    exercise_id int NOT NULL,
    set_number int NOT NULL,
    weight_kg decimal(6, 2),
    reps int,
    notes text,
    
    FOREIGN KEY (session_id) REFERENCES workout_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE
);

CREATE TABLE routines (
    routine_id serial PRIMARY KEY,
    user_id varchar(100) NOT NULL,
    routine_name varchar(100) NOT NULL,
    notes text
);

CREATE TABLE routine_exercises (
    routine_exercise_id serial PRIMARY KEY,
    routine_id int NOT NULL,
    exercise_id int NOT NULL,
    
    FOREIGN KEY (routine_id) REFERENCES routines(routine_id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id) ON DELETE CASCADE
);

INSERT INTO exercises (exercise_name, category)
VALUES
    -- Chest
    ('Bench Press (Barbell)', 'Chest'), ('Bench Press (Dumbbell)', 'Chest'), ('Incline Bench Press (Barbell)', 'Chest'),
    ('Incline Bench Press (Dumbbell)', 'Chest'), ('Decline Bench Press (Barbell)', 'Chest'), ('Decline Bench Press (Dumbbell)', 'Chest'),
    ('Chest Fly (Dumbbell)', 'Chest'), ('Chest Fly (Machine)', 'Chest'), ('Incline Chest Fly (Dumbbell)', 'Chest'),
    ('Cable Crossover (High)', 'Chest'), ('Cable Crossover (Low)', 'Chest'), ('Push Up', 'Chest'),
    ('Weighted Push Up', 'Chest'), ('Dip', 'Chest'), ('Weighted Dip', 'Chest'), ('Pullover (Dumbbell)', 'Chest'),
    -- Back
    ('Deadlift (Conventional)', 'Back'), ('Deadlift (Sumo)', 'Back'), ('Rack Pull', 'Back'), ('Pull Up', 'Back'),
    ('Weighted Pull Up', 'Back'), ('Chin Up', 'Back'), ('Weighted Chin Up', 'Back'), ('Lat Pulldown (Wide Grip)', 'Back'),
    ('Lat Pulldown (Close Grip)', 'Back'), ('Lat Pulldown (Neutral Grip)', 'Back'), ('Bent Over Row (Barbell)', 'Back'),
    ('Bent Over Row (Dumbbell)', 'Back'), ('Pendlay Row', 'Back'), ('T-Bar Row', 'Back'), ('Seated Cable Row (Wide Grip)', 'Back'),
    ('Seated Cable Row (V-Bar)', 'Back'), ('Single Arm Dumbbell Row', 'Back'), ('Machine Row', 'Back'),
    ('Hyperextension', 'Back'), ('Good Morning', 'Back'), ('Straight Arm Pulldown', 'Back'),
    -- Legs
    ('Squat (Barbell)', 'Legs'), ('Front Squat (Barbell)', 'Legs'), ('Goblet Squat (Dumbbell)', 'Legs'),
    ('Hack Squat (Machine)', 'Legs'), ('Leg Press', 'Legs'), ('Lunge (Dumbbell)', 'Legs'), ('Lunge (Barbell)', 'Legs'),
    ('Bulgarian Split Squat', 'Legs'), ('Romanian Deadlift (Barbell)', 'Legs'), ('Romanian Deadlift (Dumbbell)', 'Legs'),
    ('Stiff-Leg Deadlift', 'Legs'), ('Leg Extension (Machine)', 'Legs'), ('Leg Curl (Seated)', 'Legs'),
    ('Leg Curl (Lying)', 'Legs'), ('Hip Adduction (Machine)', 'Legs'), ('Hip Abduction (Machine)', 'Legs'),
    ('Glute Bridge', 'Legs'), ('Hip Thrust (Barbell)', 'Legs'), ('Calf Raise (Seated)', 'Legs'),
    ('Calf Raise (Standing)', 'Legs'), ('Calf Press (On Leg Press)', 'Legs'),
    -- Shoulders
    ('Overhead Press (Barbell)', 'Shoulders'), ('Overhead Press (Dumbbell)', 'Shoulders'), ('Arnold Press', 'Shoulders'),
    ('Machine Shoulder Press', 'Shoulders'), ('Lateral Raise (Dumbbell)', 'Shoulders'), ('Lateral Raise (Cable)', 'Shoulders'),
    ('Lateral Raise (Machine)', 'Shoulders'), ('Front Raise (Dumbbell)', 'Shoulders'), ('Front Raise (Plate)', 'Shoulders'),
    ('Rear Delt Fly (Dumbbell)', 'Shoulders'), ('Rear Delt Fly (Machine)', 'Shoulders'), ('Face Pull (Cable)', 'Shoulders'),
    ('Upright Row (Barbell)', 'Shoulders'), ('Upright Row (Dumbbell)', 'Shoulders'), ('Shrug (Barbell)', 'Shoulders'),
    ('Shrug (Dumbbell)', 'Shoulders'),
    -- Arms (Biceps)
    ('Bicep Curl (Barbell)', 'Arms'), ('Bicep Curl (Dumbbell)', 'Arms'), ('Bicep Curl (EZ-Bar)', 'Arms'),
    ('Hammer Curl (Dumbbell)', 'Arms'), ('Concentration Curl', 'Arms'), ('Preacher Curl (Barbell)', 'Arms'),
    ('Preacher Curl (Dumbbell)', 'Arms'), ('Cable Curl (Straight Bar)', 'Arms'), ('Cable Curl (Rope)', 'Arms'),
    ('Incline Dumbbell Curl', 'Arms'),
    -- Arms (Triceps)
    ('Close Grip Bench Press', 'Arms'), ('Tricep Pushdown (Rope)', 'Arms'), ('Tricep Pushdown (V-Bar)', 'Arms'),
    ('Tricep Pushdown (Single Arm)', 'Arms'), ('Skullcrusher (Barbell)', 'Arms'), ('Skullcrusher (Dumbbell)', 'Arms'),
    ('Overhead Tricep Extension (Dumbbell)', 'Arms'), ('Overhead Tricep Extension (Rope)', 'Arms'),
    ('Tricep Kickback (Dumbbell)', 'Arms'), ('Bench Dip', 'Arms'),
    -- Core
    ('Crunch', 'Core'), ('Weighted Crunch', 'Core'), ('Cable Crunch', 'Core'), ('Leg Raise (Hanging)', 'Core'),
    ('Leg Raise (Captains Chair)', 'Core'), ('Plank', 'Core'), ('Side Plank', 'Core'),
    ('Ab Rollout (Wheel)', 'Core'), ('Russian Twist', 'Core'), ('Wood Chop (Cable)', 'Core');