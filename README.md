## ncpass - CLI tool for Nextcloud Passwords

This is a CLI tool for Nextcloud Passwords. It allows you to interact with your passwords from the command line. It also comes with a password generator.

Additionally, a tool to copy files to and from the Nextcloud is included.

### Installation

```bash
npm install -g ncpass
```

### Configuration

You will need to have the following environment variables set:
- `NEXTCLOUD_URL`: The URL of your Nextcloud instance
- `NEXTCLOUD_USER`: Your Nextcloud username
- `NEXTCLOUD_TOKEN`: Your Nextcloud Token (you can generate one in your Nextcloud settings)

### NCPass Usage

```
ncpass <command> <label> <user> <password>
```

#### Commands

- `list`: List all the passwords in your Nextcloud Passwords vault.
- `generate <label> <username>`: Generate a new password and store it in your Nextcloud Passwords vault, also display it. Username is optional.
- `set <label> <username> <password>`: Store a password in your Nextcloud Passwords vault. Username is optional.
- `get <label> <username>`: Retrieve a password from your Nextcloud Passwords vault. Username is optional.
- `getuser <label>`: Get the username for a password in your Nextcloud Passwords vault.
- `delete <label>`: Delete a password from your Nextcloud Passwords vault.

Additional parameters for set and create commands:
- `--url <url>`: The URL for the password entry.
- `--username <username>`: The username for the password entry.
- `--notes <notes>`: Notes for the password entry.
- `--password <password>`: The password for the password entry.

#### Examples

Generate a new password, display it and store it in your Nextcloud Passwords vault:
```bash
ncpass generate my_label username
```

Retrieve a password from your Nextcloud Passwords vault:
```bash
ncpass get my_label
```

### NCP Usage

```
ncp [nc:]<file> [nc:]<folder_or_file>
```

#### Examples

Copy files to Nextcloud:
```bash
ncp file.txt nc:folder

ncp file.txt nc:folder/file_new_name.txt

ncp *.txt nc:folder
```

Copy a file from Nextcloud:
```bash
ncp nc:folder/file.txt ./

ncp nc:folder/file.txt ./file_new_name.txt
```

Copy all files from Nextcloud folder:
```bash
ncp nc:folder/* ./folder
```
