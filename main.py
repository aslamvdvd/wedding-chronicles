from app import app

if __name__ == '__main__':
    # Development server
    app.run(host='127.0.0.1', port=8080, debug=True)
else:
    # Production server (Google App Engine)
    app.config['DEBUG'] = False
    app.config['TESTING'] = False 