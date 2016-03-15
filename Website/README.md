# Translator

Web application for managing translations

## Config

Put config.json file in this directory

```json
{
	"port": 1234,
	"db": {
		"uri": "mongodb://...",
		"options": {
			"user": "...",
			"pass": "..."
		}
	}
}
```

Default admin user is automatically added when starting application with empty users table.
email: `admin@admin` password: `admin`

## Start

```bash
gulp prod  # production
gulp dev   # development
```
