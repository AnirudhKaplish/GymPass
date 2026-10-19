FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /gympass .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata && adduser -D -u 10001 app
WORKDIR /app
COPY --from=build /gympass /app/gympass
RUN mkdir -p /app/data /app/uploads && chown -R app /app
USER app
EXPOSE 8080
CMD ["/app/gympass"]
