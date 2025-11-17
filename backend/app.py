# This is the code for: backend/app.py (V-FINAL - Production Ready)

from flask import Flask, jsonify, request, send_from_directory, g
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import os 
app = Flask(__name__, static_folder='static', static_url_path='/')
CORS(app) 
DATABASE_URL = os.environ.get('DATABASE_URL')

def get_db_conn():
    if 'db' not in g:
        try:
            g.db = psycopg2.connect(DATABASE_URL)
        except psycopg2.Error as e:
            print(f"Error connecting to database: {e}")
            raise e
    return g.db

@app.teardown_appcontext
def close_db_conn(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()
def get_user_id():
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        raise Exception("Missing or invalid user ID")
    return user_id

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static_file(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/test', methods=['GET'])
def test_route():
    return jsonify({"message": "Hello from the backend!"}), 200

@app.route('/api/exercises', methods=['GET'])
def get_exercises():
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            SELECT exercise_id, exercise_name, category 
            FROM exercises 
            WHERE user_id IS NULL OR user_id = %s
            ORDER BY exercise_name
            """,
            (user_id,)
        )
        exercises = [dict(row) for row in cur.fetchall()]
        cur.close()
        return jsonify(exercises), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercises', methods=['POST'])
def create_exercise():
    try:
        user_id = get_user_id()
        data = request.get_json()
        exercise_name = data.get('exercise_name')
        category = data.get('category', 'Custom')
        if not exercise_name:
            return jsonify({"error": "Exercise name is required"}), 400
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            """
            INSERT INTO exercises (exercise_name, category, user_id) 
            VALUES (%s, %s, %s)
            RETURNING exercise_id, exercise_name, category 
            """,
            (exercise_name, category, user_id)
        )
        new_exercise = dict(cur.fetchone())
        conn.commit()
        cur.close()
        return jsonify(new_exercise), 201
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        return jsonify({"error": "You already have a custom exercise with this name"}), 409
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/start-workout', methods=['POST'])
def start_workout():
    try:
        user_id = get_user_id()
        data = request.get_json()
        title = data.get('title', 'New Workout')
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO workout_sessions (user_id, session_title) VALUES (%s, %s) RETURNING session_id",
            (user_id, title)
        )
        session_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        return jsonify({"success": True, "session_id": session_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/log-set', methods=['POST'])
def log_set():
    try:
        data = request.get_json()
        session_id = data.get('session_id'); exercise_id = data.get('exercise_id')
        set_number = data.get('set_number'); weight_kg = data.get('weight_kg'); reps = data.get('reps')
        if not all([session_id, exercise_id, set_number]):
            return jsonify({"error": "Missing data"}), 400
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO exercise_logs (session_id, exercise_id, set_number, weight_kg, reps)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (session_id, exercise_id, set_number, weight_kg, reps)
        )
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Set logged successfully"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/progress-chart/<int:exercise_id>', methods=['GET'])
def get_progress_chart(exercise_id):
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        sql_query = """
            SELECT DATE(s.session_date) as date, MAX(l.weight_kg) as heaviest_weight
            FROM exercise_logs AS l
            JOIN workout_sessions AS s ON l.session_id = s.session_id
            WHERE l.exercise_id = %s AND s.user_id = %s AND l.weight_kg > 0
            GROUP BY DATE(s.session_date)
            ORDER BY date ASC;
        """
        cur.execute(sql_query, (exercise_id, user_id))
        results = cur.fetchall()
        if not results: return jsonify([]), 200
        progress_data = {
            "dates": [row['date'].strftime('%Y-%m-%d') for row in results],
            "weights": [float(row['heaviest_weight']) for row in results] 
        }
        return jsonify(progress_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        query = """
            SELECT
                ws.session_id, ws.session_title, ws.session_date,
                COUNT(el.log_id) AS total_sets,
                STRING_AGG(DISTINCT e.exercise_name, ', ') AS exercises_done
            FROM workout_sessions AS ws
            LEFT JOIN exercise_logs AS el ON ws.session_id = el.session_id
            LEFT JOIN exercises AS e ON el.exercise_id = e.exercise_id
            WHERE ws.user_id = %s
            GROUP BY ws.session_id
            ORDER BY ws.session_date DESC;
        """
        cur.execute(query, (user_id,))
        history = [dict(row) for row in cur.fetchall()]
        cur.close()
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/exercise-log/previous', methods=['GET'])
def get_previous_set():
    try:
        user_id = get_user_id()
        exercise_id = request.args.get('exercise_id') 
        if not exercise_id: return jsonify({"error": "Missing exercise_id"}), 400
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        query = """
            SELECT el.weight_kg, el.reps
            FROM exercise_logs el
            JOIN workout_sessions ws ON el.session_id = ws.session_id
            WHERE ws.user_id = %s AND el.exercise_id = %s
            ORDER BY ws.session_date DESC, el.log_id DESC
            LIMIT 1;
        """
        cur.execute(query, (user_id, exercise_id))
        previous_set = cur.fetchone()
        cur.close()
        if previous_set:
            return jsonify(dict(previous_set)), 200
        else:
            return jsonify(None), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/routines', methods=['GET'])
def get_routines():
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        query = """
            SELECT
                r.routine_id, r.routine_name, r.notes,
                COUNT(re.exercise_id) AS exercise_count
            FROM routines r
            LEFT JOIN routine_exercises re ON r.routine_id = re.routine_id
            WHERE r.user_id = %s
            GROUP BY r.routine_id
            ORDER BY r.routine_name;
        """
        cur.execute(query, (user_id,))
        routines = [dict(row) for row in cur.fetchall()]
        cur.close()
        return jsonify(routines), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/routines/<int:routine_id>', methods=['GET'])
def get_routine_details(routine_id):
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        cur.execute(
            "SELECT routine_id, routine_name, notes FROM routines WHERE routine_id = %s AND user_id = %s",
            (routine_id, user_id)
        )
        routine = cur.fetchone()
        if not routine:
            return jsonify({"error": "Routine not found"}), 404
        cur.execute(
            """
            SELECT e.exercise_id, e.exercise_name, e.category
            FROM exercises e
            JOIN routine_exercises re ON e.exercise_id = re.exercise_id
            WHERE re.routine_id = %s;
            """,
            (routine_id,)
        )
        exercises = [dict(row) for row in cur.fetchall()]
        cur.close()
        response_data = dict(routine)
        response_data['exercises'] = exercises
        return jsonify(response_data), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/routines', methods=['POST'])
def create_routine():
    try:
        user_id = get_user_id()
        data = request.get_json()
        routine_name = data.get('routine_name')
        exercise_ids = data.get('exercise_ids', []) 
        if not routine_name:
            return jsonify({"error": "Routine name is required"}), 400
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO routines (user_id, routine_name) VALUES (%s, %s) RETURNING routine_id",
            (user_id, routine_name)
        )
        routine_id = cur.fetchone()[0]
        if exercise_ids:
            args_str = ','.join(cur.mogrify("(%s,%s)", (routine_id, ex_id)).decode('utf-8') for ex_id in exercise_ids)
            cur.execute("INSERT INTO routine_exercises (routine_id, exercise_id) VALUES " + args_str)
        conn.commit()
        cur.close()
        return jsonify({"success": True, "routine_id": routine_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/routines/<int:routine_id>', methods=['DELETE'])
def delete_routine(routine_id):
    try:
        user_id = get_user_id()
        conn = get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM routines WHERE routine_id = %s AND user_id = %s",
            (routine_id, user_id)
        )
        if cur.rowcount == 0:
            return jsonify({"error": "Routine not found or user not authorized"}), 404
        conn.commit()
        cur.close()
        return jsonify({"success": True, "message": "Routine deleted"}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500