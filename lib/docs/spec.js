var spec =
  {
    "swagger": "2.0",
    "info": {
      "description": "Тестове середовище для розробки та тестування інтерфейсів взаємодії з БС NGS.",
      "version": "2.0.1",
      "title": "Афіна Сіквел® REST сервіс",
      "license": {
        "name": "© Copyright 2016-2017 Igor Gorodetskyy <igorgo16@gmail.com>"
      },
      "contact": {
        "email": "igor-go@parus.com.ua"
      }
    },
    "host": "localhost:16161",
    "basePath": "/pub",
    "tags": [
      {
        "name": "Currencies",
        "description": "Найменування та курси валют"
      },
      {
        "name": "TestEntity",
        "description": "Тестова сутність"
      }
    ],
    "schemes": [
      "http"
    ],
    "paths": {
      "/currency": {
        "get": {
          "tags": [
            "Currencies"
          ],
          "summary": "",
          "description": "Вертає повний список валют та їх останніх курсів",
          "produces": [
            "application/xml",
            "application/json"
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "type": "array",
                "xml": {
                  "name": "ROWSET",
                  "wrapped": true
                },
                "items": {
                  "$ref": "#/definitions/Currency"
                }
              }
            }
          }
        }
      },
      "/tstEntity": {
        "get": {
          "tags": [
            "TestEntity"
          ],
          "summary": "",
          "description": "Вертає повний список сутностей",
          "produces": [
            "application/xml",
            "application/json"
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "type": "array",
                "xml": {
                  "name": "ROWSET",
                  "wrapped": true
                },
                "items": {
                  "$ref": "#/definitions/TestEntity"
                }
              }
            }
          }
        },
        "put": {
          "summary": "додавання сутності",
          "tags": [
            "TestEntity"
          ],
          "description": "Додає нову сутність",
          "produces": [
            "application/xml",
            "application/json"
          ],
          "consumes": [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
          ],
          "parameters": [
            {
              "in": "body",
              "name": "body",
              "description": "Сутність, що додається",
              "required": true,
              "schema": {
                "type": "object",
                "required": [
                  "code",
                  "name"
                ],
                "properties": {
                  "code": {
                    "type": "string",
                    "description": "Код сутності, що додається",
                    "example": "Код"
                  },
                  "name": {
                    "type": "string",
                    "description": "Найменування сутності, що додається",
                    "example": "Найменування"
                  }
                }
              }
            }
          ],
          "responses": {
            "200": {
              "description": "OK",
              "schema": {
                "type": "object",
                "xml": {
                  "name": "RESULT"
                },
                "properties": {
                  "NRN": {
                    "type": "integer",
                    "description": "Реєстраційний номер сутності в системі",
                    "example": "4687641"
                  }
                }
              }
            },
            "500": {
              "description": "Internal Server Error",
              "schema": {
                "type": "object",
                "xml": {
                  "name": "RESULT"
                },
                "properties": {
                  "error": {
                    "type": "string",
                    "xml": {
                      "name": "ERROR"
                    },
                    "example": "ORA-02290: check constraint (PARUS.C_EXTRA_DICTS_VALUES_VAL) violated ORA-06512: at line 17"
                  }
                }
              }
            }
          }
        },
        "patch": {
          "summary": "виправлення сутністі",
          "description": "Виправленя коду та/чи найменування існуючої сутністі",
          "tags": [
            "TestEntity"
          ],
          "produces": [
            "application/xml",
            "application/json"
          ],
          "consumes": [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
          ],
          "parameters": [
            {
              "in": "body",
              "name": "body",
              "schema": {
                "type": "object",
                "required": [
                  "code",
                  "rn",
                  "name"
                ],
                "properties": {
                  "rn": {
                    "type": "integer",
                    "description": "Реєстраційний номер сутності, що виправляється",
                    "example": "4687641"
                  },
                  "code": {
                    "type": "string",
                    "description": "Новий код сутності",
                    "example": "Код"
                  },
                  "name": {
                    "type": "string",
                    "description": "Нове найменування сутності",
                    "example": "Нове найменування"
                  }
                }
              }
            }
          ],
          "responses": {
            "204": {
              "description": "No Content"
            },
            "500": {
              "description": "Internal Server Error",
              "schema": {
                "type": "object",
                "xml": {
                  "name": "ERROR",
                  "wrapped": false
                },
                "properties": {
                  "error": {
                    "type": "string",
                    "xml": {
                      "name": "MESSAGE",
                      "wrapped": false
                    },
                    "example": "ORA-20103: Дублирование значения. ORA-06512: at line 16"
                  }
                }
              }
            }
          }
        },
        "delete": {
          "summary": "видалення сутністі",
          "description": "Виправленя коду та/чи найменування існуючої сутністі",
          "tags": [
            "TestEntity"
          ],
          "produces": [
            "application/xml",
            "application/json"
          ],
          "consumes": [
            "application/json",
            "application/x-www-form-urlencoded",
            "multipart/form-data"
          ],
          "parameters": [
            {
              "in": "body",
              "name": "body",
              "schema": {
                "type": "object",
                "required": [
                  "rn"
                ],
                "properties": {
                  "rn": {
                    "type": "integer",
                    "description": "Реєстраційний номер сутності, що видаляється",
                    "example": "4687641"
                  }
                }
              }
            }
          ],
          "responses": {
            "204": {
              "description": "No Content"
            }
          }
        }
      },
      "/tstEntity/{code}": {
        "get": {
          "tags": [
            "TestEntity"
          ],
          "summary": "",
          "description": "Вертає сутність по зазначеному в URL коду",
          "produces": [
            "application/xml",
            "application/json"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "code",
              "description": "Код сутності, що потрібно повернути",
              "type": "string",
              "required": true
            }
          ],
          "responses": {
            "200": {
              "description": "successful operation",
              "schema": {
                "type": "array",
                "xml": {
                  "name": "ROWSET",
                  "wrapped": true
                },
                "items": {
                  "$ref": "#/definitions/TestEntity"
                }
              }
            }
          }
        }
      }
    },
    "definitions": {
      "Currency": {
        "type": "object",
        "xml": {
          "name": "ROW"
        },
        "properties": {
          "RN": {
            "type": "integer",
            "description": "Реєстраційний номер валюти в системі",
            "example": 376558
          },
          "CURCODE": {
            "type": "string",
            "description": "Цифровий код валюти (національна класифікація)",
            "example": "036"
          },
          "INTCODE": {
            "type": "string",
            "description": "ISO код валюти (міжнародна класифікація)",
            "example": "AUD"
          },
          "CURNAME": {
            "type": "string",
            "description": "Найменування валюти (міжнародна класифікація)",
            "example": "австралiйський долар"
          },
          "DCURDATEBEG": {
            "type": "string",
            "format": "date-time",
            "description": "Дата, на яку зареєстровано останній курс"
          },
          "NCURSUM": {
            "type": "number",
            "description": "Сумма в валюті (сумма, за яку встановлено курс)",
            "example": 100
          },
          "NEQUALSUM": {
            "type": "number",
            "description": "Сумма в гривні (курс за NEQUALSUM валюти)",
            "example": 838.2775
          }
        }
      },
      "TestEntity": {
        "type": "object",
        "xml": {
          "name": "ROW"
        },
        "required": [
          "NRN",
          "SCODE",
          "SNAME"
        ],
        "properties": {
          "NRN": {
            "type": "string",
            "description": "Код сутності",
            "example": "Код"
          },
          "SCODE": {
            "type": "string",
            "description": "Код сутності",
            "example": "Код"
          },
          "SNAME": {
            "type": "string",
            "description": "Найменування сутності",
            "example": "Найменування"
          }
        }
      }
    }
  }
