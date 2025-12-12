export const YAML_SAMPLE = `# Lush breadcrumb demo
apiVersion: v1
kind: Config
metadata:
  name: demo
  labels:
    app: lush
spec:
  replicas: 2
  containers:
    - name: web
      image: nginx:latest
      ports: [80, 443]
    - name: worker
      env:
        - key: QUEUE
          value: default
`

