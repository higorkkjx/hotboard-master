function formatarTexto(richTextArray) {
    let result = richTextArray.reduce((accumulator, current, index, array) => {
      if (current.type === "a" && current.url) {
        return accumulator + current.children[0].text.trim() + " (" + current.url + ")\n";
      } else if (current.children && current.children[0] && current.children[0].text) {
        return accumulator + current.children[0].text.trim() + "\n";
      } else {
        // Adiciona quebra de linha se não for o último elemento ou se não for vazio
        return accumulator + (index !== array.length - 1 ? "\n" : "");
      }
    }, "");
    return result.trimEnd();
  }
  
  // Função para formatar para funil
  function formatarParaFunil(json) {
    const funilName = json[0].result.data.json.typebot.name;
    const funilGroups = json[0].result.data.json.typebot.groups;
  
    const funilFormatado = {
      funilName: funilName,
      funil: [],
    };
  
    let sequencia = 0;
  
    funilGroups.forEach((group) => {
      group.blocks.forEach((block) => {
        sequencia++;
  
        let tipoMensagem, conteudo;
  
        switch (block.type) {
          case "text":
            tipoMensagem = "text";
            conteudo = formatarTexto(block.content.richText);
            break;
          case "Wait":
            tipoMensagem = "wait";
            conteudo = parseInt(block.options.secondsToWaitFor);
            break;
          case "image":
          case "video":
          case "audio":
            tipoMensagem = block.type;
            conteudo = block.content.url;
            break;
          default:
            tipoMensagem = "unknown";
            conteudo = null;
        }
  
        funilFormatado.funil.push({
          sequencia: sequencia,
          tipoMensagem: tipoMensagem,
          conteudo: conteudo,
        });
      });
    });
  
    return funilFormatado;
  }
  
  // Função para formatar para funil avançado
  function formatarParaFunilAvancado(json) {
    const funilName = json[0].result.data.json.typebot.name;
    const funilGroups = json[0].result.data.json.typebot.groups;
    let input_total = 0;
  
    const funilFormatado = {
      funilName: "dinamico_" + funilName,
      funil: [],
      input_total: input_total,
      inputs_respostas: [],
    };
  
    let sequencia = 0;
    let inputidatual = null;
    funilGroups.forEach((group) => {
      group.blocks.forEach((block) => {
        let tipoMensagem, conteudo, idInput;
  
        switch (block.type) {
          case "text input":
            sequencia++;
            tipoMensagem = "input";
            conteudo = block.options.labels.placeholder;
            idInput = block.id;
            input_total++;
            inputidatual = block.id;
            funilFormatado.inputs_respostas.push({
              input_id: idInput,
              resposta: null,
            });
            break;
          case "text":
            tipoMensagem = "text";
            idInput = block.id;
            conteudo = formatarTexto(block.content.richText);
            conteudo = conteudo.replace(/{{([^}]+)}}/g, (_, match) => {
              const variable = json[0].result.data.json.typebot.variables.find(v => v.name === match.trim());
              return `%var=${inputidatual}%`;
            });
            break;
          case "Wait":
            idInput = block.id;
            tipoMensagem = "wait";
            conteudo = parseInt(block.options.secondsToWaitFor);
            break;
          case "image":
          case "video":
          case "audio":
            idInput = block.id;
            tipoMensagem = block.type;
            conteudo = block.content.url;
            break;
          default:
            tipoMensagem = "unknown";
            conteudo = null;
        }
  
        funilFormatado.funil.push({
          sequencia: sequencia,
          tipoMensagem: tipoMensagem,
          conteudo: conteudo,
          idInput: idInput,
        });
      });
    });
  
    funilFormatado.input_total = input_total;
    return funilFormatado;
  }
  
  // Teste com os dados fornecidos
  const jsonData = [
    {
        "result": {
            "data": {
                "json": {
                    "typebot": {
                        "version": "6",
                        "id": "clx9iphh5000a6o4dl4j2sy2n",
                        "name": "My typebot",
                        "events": [
                            {
                                "id": "h0cya446a2yn9teww6dznk4h",
                                "outgoingEdgeId": "hur3wzedd80ebfkxyojrkzls",
                                "graphCoordinates": {
                                    "x": 0,
                                    "y": 0
                                },
                                "type": "start"
                            }
                        ],
                        "groups": [
                            {
                                "id": "zxii42y2zyptksgz5to8syem",
                                "title": "Group #1",
                                "graphCoordinates": {
                                    "x": 59,
                                    "y": 50
                                },
                                "blocks": [
                                    {
                                        "id": "n3wis65vir19nq4ys6xwuima",
                                        "type": "text",
                                        "content": {
                                            "richText": [
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "Oi, isso é uma mensagem de texto sem espaço e quebra de linhas."
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "id": "fn7b52uskd22usei01un589w",
                                        "type": "image",
                                        "content": {
                                            "url": "https://s3.typebot.io/public/workspaces/clet5heas000el608dxzcv15x/typebots/clx9iphh5000a6o4dl4j2sy2n/blocks/fn7b52uskd22usei01un589w?v=1718056937453"
                                        }
                                    },
                                    {
                                        "id": "rqnr1h0x6jr8j47t6nrxf921",
                                        "type": "Wait",
                                        "options": {
                                            "secondsToWaitFor": "4"
                                        }
                                    },
                                    {
                                        "id": "wuwif7m523h1d28mik6uh1pj",
                                        "type": "video",
                                        "content": {
                                            "url": "https://raw.githubusercontent.com/higorkkjx/uploads2/main/449c181c-5d1b-41fa-837a-ce8aed62ff74.mp4",
                                            "type": "url"
                                        }
                                    },
                                    {
                                        "id": "fhtqahohw00jt9vicca790gg",
                                        "type": "text",
                                        "content": {
                                            "richText": [
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "Enfim, isso é uma mensagem "
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": ""
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": ""
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "com espaços"
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": ""
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "e quebras de linhas!"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "id": "eojrzwmjfa4qkw6t1j5xk3r0",
                                        "type": "text input",
                                        "options": {
                                            "labels": {
                                                "placeholder": "Isso é um input, você está bem?"
                                            }
                                        }
                                    },
                                    {
                                        "id": "jrmnqej1o6pmb36cmy1bt27s",
                                        "type": "Wait",
                                        "options": {
                                            "secondsToWaitFor": "1"
                                        }
                                    },
                                    {
                                        "id": "r1hf7oma99xxl1mkr5cjcxgh",
                                        "type": "text",
                                        "content": {
                                            "richText": [
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "Hmm, fico feliz em saber que você está bem!"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "id": "rzbj2m5v4kq48gvjpeocz5lt",
                                        "type": "text input",
                                        "options": {
                                            "labels": {
                                                "placeholder": "Qual seu nome?",
                                                "button": "Enviar"
                                            },
                                            "variableId": "vq7bojg9kpo8b4yxescqivtz9"
                                        }
                                    },
                                    {
                                        "id": "ttkq9euonjjkd7anuj4t11s3",
                                        "type": "text",
                                        "content": {
                                            "richText": [
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "Prazer, {{nome}}"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    },
                                    {
                                        "id": "uyfcykjir78h8u7txkzls24a",
                                        "type": "text",
                                        "content": {
                                            "richText": [
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "meu site: https://kiwify.com.br"
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": ""
                                                        }
                                                    ]
                                                },
                                                {
                                                    "type": "p",
                                                    "children": [
                                                        {
                                                            "text": "acessa ai, ta bom?"
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        ],
                        "edges": [
                            {
                                "id": "hur3wzedd80ebfkxyojrkzls",
                                "from": {
                                    "eventId": "h0cya446a2yn9teww6dznk4h"
                                },
                                "to": {
                                    "groupId": "zxii42y2zyptksgz5to8syem"
                                }
                            }
                        ],
                        "variables": [
                            {
                                "id": "vq7bojg9kpo8b4yxescqivtz9",
                                "name": "nome",
                                "isSessionVariable": true
                            }
                        ],
                        "theme": {},
                        "selectedThemeTemplateId": null,
                        "settings": {
                            "general": {
                                "isBrandingEnabled": true
                            },
                            "publicShare": {
                                "isEnabled": true
                            }
                        },
                        "createdAt": "2024-06-10T22:01:20.825Z",
                        "updatedAt": "2024-06-10T22:33:25.940Z",
                        "icon": null,
                        "folderId": null,
                        "publicId": "my-typebot-4j2sy2n",
                        "customDomain": null,
                        "workspaceId": "clet5heas000el608dxzcv15x",
                        "resultsTablePreferences": null,
                        "isArchived": false,
                        "isClosed": false,
                        "whatsAppCredentialsId": null,
                        "riskLevel": null
                    },
                    "currentUserMode": "write"
                },
                "meta": {
                    "values": {
                        "typebot.createdAt": [
                            "Date"
                        ],
                        "typebot.updatedAt": [
                            "Date"
                        ]
                    }
                }
            }
        }
    }
]
  
  console.log(formatarParaFunil(jsonData));
  console.log(formatarParaFunilAvancado(jsonData));
  