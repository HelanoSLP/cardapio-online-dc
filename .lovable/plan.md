# Resposta automática uma vez por ciclo de pedido

## Objetivo
Fazer o WhatsApp responder na primeira mensagem de cada cliente e permanecer em silêncio nas mensagens seguintes. Uma nova resposta será liberada somente depois que um novo pedido daquele número for marcado como **Entregue** no painel.

## Implementação
- Criar um registro interno por número de WhatsApp para guardar até qual pedido entregue a saudação já foi enviada.
- Adicionar uma função atômica no banco que decide se a mensagem pode ser enviada, evitando respostas duplicadas quando o webhook recebe eventos repetidos.
- Atualizar o webhook para consultar essa função antes de enviar a saudação e o link do cardápio.
- Validar estes cenários: primeiro contato responde; mensagens repetidas ficam sem resposta; pedido em andamento não libera; após marcar como entregue, a próxima mensagem responde uma vez.

## Detalhes técnicos
- O número será normalizado apenas com dígitos e comparado pelas terminações para aceitar variações com ou sem o código `55`.
- A tabela será privada, com acesso apenas da função de backend, RLS habilitado e sem exposição ao cliente.
- O envio continuará ignorando mensagens enviadas pelo próprio WhatsApp da loja.
