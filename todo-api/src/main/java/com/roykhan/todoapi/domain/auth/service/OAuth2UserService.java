package com.roykhan.todoapi.domain.auth.service;

import com.roykhan.todoapi.domain.user.User;
import com.roykhan.todoapi.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OAuth2UserService extends OidcUserService {

    private final UserRepository userRepository;

    @Override
    @Transactional
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        String email = oidcUser.getEmail();
        String name = oidcUser.getFullName();
        String picture = oidcUser.getPicture();
        String provider = userRequest.getClientRegistration().getRegistrationId();

        log.info("email: {}, name: {}, provider: {}", email, name, provider);

        userRepository.findByEmail(email)
            .ifPresentOrElse(
                user -> user.updateProfile(name, picture),
                () -> userRepository.save(User.create(email, name, picture, provider)));

        return oidcUser;
    }
}
