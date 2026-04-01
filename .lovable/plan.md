
## Plano de Alterações

### Painel Admin - Aba Pedidos
1. **Status de pedido pickup**: Quando o cliente escolher "buscar no estabelecimento", mostrar apenas "Em preparo" e "Pedido entregue" como opções de status

### Painel Admin - Aba Cardápio
2. **Cashback por produto**: Adicionar toggle de cashback na edição de produto (similar ao de promoção), com campo de porcentagem baseado no preço do produto
3. **Categorias - corrigir edição**: Consertar o botão de edição (lápis) nas categorias, com opções de renomear e reordenar subcategorias
4. **Subcategorias - edição simplificada**: Opção de edição com apenas renomear
5. **Adicionais - remover ordem**: Remover opção "ordem" da edição de adicionais
6. **Preço de pizza por tamanho**: Permitir definir preço diferente para cada tamanho de pizza

### Painel Admin - Aba Configurações
7. **Remover cashback das configurações**: Tirar a seção de cashback da aba configurações
8. **Identidade da loja**: Remover edição do nome da empresa, manter apenas logo

### Painel Admin - Remoções
9. **Remover aba Promoções** inteira do painel admin (incluindo banners)

### Site Principal (Cardápio do Cliente)
10. **Aba Promoções**: Mostrar apenas produtos com cashback e/ou promoção ativa
11. **Badge de cashback**: Exibir faixa no produto com "Cashback ativo X%"
12. **Remover remoção de ingredientes**: Manter apenas campo de observação
13. **Pizza - sabor pré-selecionado**: O sabor escolhido já vem marcado e bloqueado na seleção de sabores adicionais
14. **Impressão de pedido**: Corrigir espaço em branco extra na impressão

### Banco de Dados
15. **Migração**: Adicionar colunas `cashback_active` (boolean) e `cashback_percent` (numeric) na tabela `products`
