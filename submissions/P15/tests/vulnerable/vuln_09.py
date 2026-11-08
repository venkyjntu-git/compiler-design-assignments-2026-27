user = input()
query = 'SELECT * FROM users WHERE name=' + user
cursor.execute(query)
