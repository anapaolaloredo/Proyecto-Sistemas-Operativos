from flask import Flask, render_template, request, jsonify
from models.process import Process

app = Flask(__name__)

processes = []

@app.route("/")
def index():
    return render_template("index.html")

# ➜ agregar proceso manual
@app.route("/add_process", methods=["POST"])
def add_process():
    data = request.json
    p = Process(data["name"], data["burst"], data["arrival"])
    processes.append(p.to_dict())
    return jsonify(processes)

# ➜ cargar archivo txt
@app.route("/upload", methods=["POST"])
def upload():
    file = request.files["file"]
    lines = file.read().decode().splitlines()

    global processes
    processes = []

    for line in lines:
        name, burst, arrival = line.split(",")
        processes.append(Process(name, int(burst), int(arrival)).to_dict())

    return jsonify(processes)

# ➜ obtener procesos
@app.route("/processes")
def get_processes():
    return jsonify(processes)

if __name__ == "__main__":
    app.run(debug=True)