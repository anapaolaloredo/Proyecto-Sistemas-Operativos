from flask import Flask, render_template
from controllers.scheduler_controller import scheduler_bp

app = Flask(__name__)

# registrar controlador
app.register_blueprint(scheduler_bp)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(debug=True)