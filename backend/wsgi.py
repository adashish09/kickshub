import os
import pymysql

# Alias PyMySQL as MySQLdb for WSGI servers
pymysql.install_as_MySQLdb()

from app import create_app

# WSGI application entry point
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
