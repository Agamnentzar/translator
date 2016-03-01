# Verity Translator

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

## Start

```bash
gulp prod  # production
gulp dev   # development
```
