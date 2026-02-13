
# 🍕 Sistema de Pedidos - Pizzaria & Lanchonete

## Visão Geral
Sistema completo de pedidos online com cardápio digital, carrinho de compras, integração com WhatsApp e painel administrativo para gerenciar pedidos e cardápio.

---

## 1. 📱 Cardápio Digital (Página do Cliente)
- **Página principal** com o nome/logo da pizzaria e categorias do cardápio (Pizzas, Lanches, Bebidas, Combos, etc.)
- **Listagem de produtos** com foto, nome, descrição, preço e botão de adicionar ao carrinho
- Produtos de exemplo para começar (pizzas, lanches, bebidas)
- **Opção de personalização** ao adicionar: remover ingredientes, observações especiais (ex: "sem cebola", "borda recheada")
- Design mobile-first, já que os clientes acessam pelo celular

## 2. 🛒 Carrinho de Compras
- Carrinho flutuante mostrando quantidade de itens e valor total
- Tela do carrinho com lista de itens, quantidades editáveis e opção de remover
- Exibição do subtotal e total do pedido

## 3. 📝 Finalização do Pedido (Checkout)
- Formulário com campos obrigatórios:
  - **Nome do cliente**
  - **Número de WhatsApp**
  - **Endereço completo** (rua, número, bairro)
  - **Ponto de referência**
  - **Observações gerais** do pedido
  - **Forma de pagamento**: Dinheiro (com campo "troco para quanto?"), Cartão (débito/crédito), Pix
- Resumo final do pedido antes de confirmar
- Ao confirmar, o pedido é enviado formatado para o WhatsApp da pizzaria via link direto (wa.me) com todos os detalhes organizados

## 4. 🖥️ Painel Administrativo
- **Login protegido** para o dono/funcionários
- **Dashboard** com pedidos do dia e resumo de vendas
- **Gestão de pedidos**: visualizar todos os pedidos recebidos, com detalhes completos
- **Atualizar status do pedido**: Recebido → Em preparo → Saiu para entrega → Entregue
- **Botão de imprimir** cada pedido (abre a tela de impressão do navegador com layout otimizado para impressora térmica/comum)
- **Gestão do cardápio**: adicionar, editar, remover produtos, alterar preços, ativar/desativar itens, organizar categorias
- **Notificação sonora** quando um novo pedido chegar

## 5. 💬 Integração WhatsApp
- **Link de entrada**: link direto (wa.me) que o cliente clica e é direcionado ao WhatsApp da pizzaria com mensagem automática de boas-vindas contendo o link do cardápio digital
- **Envio do pedido**: ao finalizar, o pedido completo é enviado formatado para o WhatsApp da pizzaria
- O dono pode compartilhar o link do cardápio nas redes sociais, Instagram, etc.

## 6. 🗄️ Backend (Banco de Dados)
- Banco de dados para armazenar: produtos/cardápio, pedidos, categorias
- Atualização em tempo real dos pedidos no painel admin (novos pedidos aparecem automaticamente)

---

## Fluxo do Cliente
1. Cliente clica no link do WhatsApp → recebe mensagem com link do cardápio
2. Acessa o cardápio digital → escolhe produtos → adiciona ao carrinho
3. Vai ao checkout → preenche dados (endereço, WhatsApp, pagamento, observações)
4. Confirma o pedido → pedido é salvo no sistema e enviado formatado para o WhatsApp
5. Dono vê o pedido no painel admin → atualiza status conforme prepara e entrega
