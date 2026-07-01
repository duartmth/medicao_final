# Estágio de Build (Compilação do Frontend React)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Estágio de Produção (Servindo os arquivos estáticos com Nginx)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Configuração personalizada do Nginx para suportar roteamento SPA e Proxy Reverso para a API
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
