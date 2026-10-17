# glacier

Persistent container Ned execs into. `/workspace` in the container is `~/glacier` on K1. Files there stay when the container or Ned restarts.

```sh
docker compose up -d
```

The name of the container has to be the value of `GLACIER_CONTAINER_NAME` (it's `glacier` if omitted).