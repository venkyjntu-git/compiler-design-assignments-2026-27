import hashlib
import pickle
import subprocess

password = "mysecret123"
user_value = input("Enter expression: ")
result = eval(user_value)
exec(user_value)
subprocess.run(user_value, shell=True)
digest = hashlib.md5(b"hello").hexdigest()
obj = pickle.loads(user_value)
