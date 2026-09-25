# Build context is the repo root (see docker-compose.yml) so the shared
# allocation package can be installed alongside the API.
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY packages/allocation /packages/allocation
RUN pip install --no-cache-dir /packages/allocation

COPY services/api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/api/ .
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh
EXPOSE 8000
CMD ["./entrypoint.sh"]
