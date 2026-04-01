package com.reporteloya.backend.config;

import org.springframework.lang.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;


@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            System.out.println("🔌 WS: CONNECT recibido");
            
            String token = accessor.getFirstNativeHeader("Authorization");
            System.out.println("🔌 WS: Token del header: " + (token != null ? "presente" : "NULL"));
            
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                System.out.println("🔌 WS: Token JWT extraído,长度: " + token.length());
                
                String userId = JwtUtils.validateTokenAndGetUserId(token);
                System.out.println("🔌 WS: userId del token: " + userId);
                
                if (userId != null) {
                    accessor.setUser(() -> userId);
                    System.out.println("🔌 WS: Principal establecido para userId: " + userId);
                } else {
                    System.out.println("⚠️ WS: Token inválido, no se establece principal");
                }
            } else {
                System.out.println("⚠️ WS: No hay token Bearer, conectando sin autenticación");
            }
        }
        return message;
    }
}
