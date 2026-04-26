package yovi;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;

public class LoadTest extends Simulation {

    // URL base del Users Service
    HttpProtocolBuilder httpProtocol = http
            .baseUrl("https://localhost:3000")
            .acceptHeader("application/json")
            .contentTypeHeader("application/json")
            .disableFollowRedirect();

    // Feeder con usuarios de prueba
    FeederBuilder<String> feeder = csv("users.csv").circular();

    // Escenario: login + reset + 3 movimientos + rendición
    ScenarioBuilder scn = scenario("YoVi - Partida completa")
            .feed(feeder)

            // 1. Login
            .exec(http("Login")
                    .post("/login")
                    .body(StringBody(
                            "{\"username\":\"#{username}\",\"password\":\"#{password}\"}"
                    ))
                    .check(status().is(200))
                    .check(jsonPath("$.token").saveAs("token"))
            )
            .pause(1)

            // 2. Reset (iniciar partida)
            .exec(http("Reset partida")
                    .post("/reset")
                    .header("Authorization", "Bearer #{token}")
                    .body(StringBody(
                            "{\"player\":\"#{username}\",\"size\":6,\"difficulty\":\"Easy\"}"
                    ))
                    .check(status().is(200))
            )
            .pause(1)

            // 3. Movimiento 1
            .exec(http("Movimiento 1")
                    .post("/move")
                    .header("Authorization", "Bearer #{token}")
                    .body(StringBody(
                            "{\"cellIndex\":3," +
                                    "\"username\":\"#{username}\"," +
                                    "\"difficulty\":\"Easy\"," +
                                    "\"boardSize\":6," +
                                    "\"boardLabel\":\"Pequeno\"," +
                                    "\"locale\":\"es\"," +
                                    "\"resultLabel\":\"Victoria\"}"
                    ))
                    .check(status().is(200))
            )
            .pause(1)

// 4. Movimiento 2
            .exec(http("Movimiento 2")
                    .post("/move")
                    .header("Authorization", "Bearer #{token}")
                    .body(StringBody(
                            "{\"cellIndex\":8," +
                                    "\"username\":\"#{username}\"," +
                                    "\"difficulty\":\"Easy\"," +
                                    "\"boardSize\":6," +
                                    "\"boardLabel\":\"Pequeno\"," +
                                    "\"locale\":\"es\"," +
                                    "\"resultLabel\":\"Victoria\"}"
                    ))
                    .check(status().is(200))
            )
            .pause(1)


             // 5. Rendición
        .exec(http("Rendicion")
            .post("/surrender")
            .header("Authorization", "Bearer #{token}")
            .body(StringBody(
                    "{\"username\":\"#{username}\"," +
                    "\"difficulty\":\"Easy\"," +
                    "\"boardSize\":6," +
                    "\"boardLabel\":\"Pequeno\"," +
                    "\"locale\":\"es\"," +
                    "\"resultLabel\":\"Derrota\"}"
            ))
                    .check(status().is(200))
                    )
                    .pause(1)

            // 6. Historial
            .exec(http("Historial")
                    .get("/history?username=#{username}&page=1&limit=5")
                    .header("Authorization", "Bearer #{token}")
                    .check(status().is(200))
            );

    // Configuración de la carga
    {
        setUp(
                scn.injectOpen(
                        // Escenario 1: carga sostenida - 10 usuarios
                        rampUsers(10).during(30),           // sube a 10 usuarios en 30s
                        constantUsersPerSec(2).during(60),   // mantiene 2/s durante 1 minuto
                        // Escenario 2: pico de carga - 25 usuarios
                        nothingFor(10),
                        rampUsers(25).during(15),
                        constantUsersPerSec(4).during(30)
                )
        )
                .protocols(httpProtocol)
                .assertions(
                        global().responseTime().percentile(95).lt(500),
                        global().successfulRequests().percent().gt(95.0)
                );
    }
}