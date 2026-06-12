# Firebase Database Reference

Ford VEV uses **both** Firestore (document/collection) and Realtime Database (JSON tree). Firestore stores historic/complex data; RTDB stores live operational state.

## Firebase Config

```js
{
    apiKey: "AIzaSyCY5aZ2WzeY8miMomN3OgR6al4psXGnE3A",
    authDomain: "ford-vev.firebaseapp.com",
    databaseURL: "https://ford-vev-default-rtdb.firebaseio.com",
    projectId: "ford-vev",
    storageBucket: "ford-vev.firebasestorage.app",
    messagingSenderId: "391022165832",
    appId: "1:391022165832:web:cfa6c741c946a030b37d7d",
    measurementId: "G-EDFWJB8XE3",
}
```

## Firestore Collections (19)

| Collection | Type | Document ID | Fields |
|------------|------|-------------|--------|
| `vev_usuarios` | Auth profiles | `uid` | nome, email, cargo, aprovado, ativo, criadoEm, ultimoAcesso, tentativasLogin, bloqueadoAte |
| `vev_operadores` | Operator registry | `uid` | nome, email, cargo, matricula, ativo, origem (auth/manual), criadoEm |
| `vev_projetos` | Projects | auto | nome, codigo, ativo, formularios[], criadoEm |
| `vev_testes_pista` | Track test types | auto | nome, categoria, icone, ambiente, unidadeMetrica, metricasExtras[], descricao, ativo |
| `vev_veiculos` | Vehicle fleet | auto | nome, vin, eja, cc, kmAtual, placa, modelo, ano, ativo, projeto, outrasInfo |
| `vev_postos` | Fuel stations | auto | nome, endereco, ativo |
| `vev_turnos_encerrados` | Completed shifts | auto | operador, veiculo, projeto, ambiente, tipoTeste, kmInicial, kmFinal, litros, posto, observacoes, abastecimentos[], horaInicio, horaFim, uid |
| `vev_issues` | Technical laudos | auto | veiculo, operador, severidade, sistema, descricao, kmVeiculo, fotos[], resolvido, criadoEm |
| `vev_notificacoes` | App notifications | auto | tipo, mensagem, dados{}, lida, criadaEm |
| `vev_config` | System config | auto | chave, valor, atualizadoEm |
| `vev_configuracoes_globais` | Global settings | auto | chave, valor, descricao |
| `vev_logs_seguranca` | Security audit | auto | uid, email, acao, detalhes, ip, timestamp |
| `viagens/{uid}/historico` | GPS trip history | auto | rota[], distancia, velocidadeMedia, velocidadeMax, data |

## Realtime Database Paths (9)

| Path | Purpose | Structure |
|------|---------|-----------|
| `vev_turnos/{data}/{operador}` | Live shift state per day | `{ kmInicial, kmAtual, horaInicio, projeto, veiculo, abastecimentos[] }` |
| `vev_turnos_encerrados/` | RTDB mirror of completed | `{...turno data}` |
| `vev_turnos_ativos/{uid}` | Currently active shifts | `{...turno data, timestamp}` |
| `vev_issues/` | RTDB mirror of laudos | `{...issue data}` |
| `vev_gps_batch/{data}/{operador}` | Batched GPS points | `{ coordenadas[], timestamps[] }` |
| `vev_sessoes_teste/` | Test sessions | `{ operador, veiculo, projeto, inicio, fim }` |
| `vev_config/` | Runtime config | Key-value pairs |
| `vev_operadores/` | RTDB operator cache | Same as Firestore |

## Data Flow

```
Operator Action               Firestore                     RTDB                     Dashboard
─────────────────────────────────────────────────────────────────────────────────────────────
Iniciar Turno          →                                           set vev_turnos_ativos
                       →                    set vev_turnos/{date}/{op}
GPS Batch              →                              push vev_gps_batch
Abastecimento          →      add to turno.abastecimentos[]
Encerrar Turno         →      add vev_turnos_encerrados    remove vev_turnos_ativos
                                                                            ← GET turnos_encerrados
                                                                            ← GET turnos_ativos
Laudo Técnico          →      add vev_issues
                       →      add vev_notificacoes (if critical)
Login                  →      read/update vev_usuarios     ← Auth persistence
                       →      set vev_operadores (auto)
                       →      write vev_logs_seguranca
```

## Key Data Shapes

### Turno (Completed Shift)
```json
{
  "operador": "João Silva",
  "veiculo": "Ranger XYZ-1234",
  "projeto": "EET Ranger 2024 - Drive Team",
  "ambiente": "Interno",
  "tipoTeste": "Durabilidade",
  "kmInicial": 298855,
  "kmFinal": 299205,
  "litros": 45.5,
  "posto": "TPG",
  "observacoes": "Troca de piloto às 14h",
  "abastecimentos": [
    { "posto": "TPG", "tipoCombustivel": "Diesel S10", "litros": 30, "kmAtual": 299000, "hora": "11:30" }
  ],
  "horaInicio": "08/06/2026 07:30:00",
  "horaFim": "08/06/2026 17:00:00",
  "uid": "abc123..."
}
```

### Laudo (Technical Issue)
```json
{
  "veiculo": "Ranger ABC-5678",
  "operador": "Maria Santos",
  "severidade": "Grave",
  "sistema": "Freios",
  "descricao": "Ruído metálico ao frear em pista molhada",
  "kmVeiculo": 45200,
  "fotos": ["data:image/jpeg;base64,..."],
  "resolvido": false,
  "criadoEm": { "serverTimestamp": true }
}
```

### Abastecimento (Fuel Refueling)
```json
{
  "posto": "TPG",
  "tipoCombustivel": "Gasolina Aditivada",
  "litros": 50.0,
  "kmAtual": 45250,
  "hora": "14:30",
  "timestamp": "2026-06-08T17:30:00.000Z"
}
```

## Google Sheets Sync

A Google Apps Script (`Script vev tabela.txt`, 433 lines) periodically syncs Firestore data to a Google Sheets workbook with 7 tabs (Turnos, Abastecimentos, Veículos, Operadores, Laudos, Projetos, Postos).

## Firebase Security Rules

Authentication enforced at application level:
- SDK read/write from dashboard using service account (`Jsonfirebase/gestao-de-veiculos-municipal-73f568e0811b.json`)
- Frontend uses Firebase Auth with email/password
- Only `@ford.com` emails can register (auto-approved)
- 3 failed login attempts → 5-minute cooldown
- Security audit log on every auth action
