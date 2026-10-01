FROM eclipse-temurin:17-jdk

WORKDIR /app

COPY . .

RUN mkdir -p bin && javac -d bin src/com/minisearch/*.java

EXPOSE 10000

CMD ["java", "-cp", "bin", "com.minisearch.WebServer"]