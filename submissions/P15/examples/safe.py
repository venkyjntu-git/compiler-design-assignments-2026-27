import hashlib
import subprocess

user_value = input("Enter a filename: ")
# Safer: pass arguments as a list and do not invoke a shell.
subprocess.run(["echo", user_value], shell=False)
digest = hashlib.sha256(b"hello").hexdigest()
print(user_value)
