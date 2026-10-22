import os
import pymysql

# Alias PyMySQL as MySQLdb for external drivers
pymysql.install_as_MySQLdb()

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = app.config.get("DEBUG", False)
    app.run(host="0.0.0.0", port=port, debug=debug)
