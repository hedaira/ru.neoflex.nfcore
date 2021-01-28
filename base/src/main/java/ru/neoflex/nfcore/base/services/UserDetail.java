package ru.neoflex.nfcore.base.services;

import org.eclipse.emf.ecore.resource.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import ru.neoflex.nfcore.base.auth.*;
import ru.neoflex.nfcore.base.components.CurrentUser;
import ru.neoflex.nfcore.base.util.DocFinder;

import java.util.*;

@Service
public class UserDetail implements UserDetailsService {

    public static final String SYSTEM_DEVELOPER = "/system/developer";
    @Autowired
    Store store;

    @Autowired
    Context context;

    @Override
    public UserDetails loadUserByUsername(String userName) throws UsernameNotFoundException {
        try {
            return store.inTransaction(true, (tx)->{
                String password = null;
                final HashSet<GrantedAuthority> au = new HashSet<>();

                if(userName == null){
                    return null;
                }

                DocFinder docFinder = DocFinder.create(store,
                        AuthPackage.Literals.USER, new HashMap<String, String>() {{put("name", userName);}});
                List<Resource> resources = docFinder.execute().getResources();
                if (resources.isEmpty()) {
                    context.getAuthorization().log("invalid login attempt", userName);
                    return null;
                }
                ru.neoflex.nfcore.base.auth.User user = (ru.neoflex.nfcore.base.auth.User) resources.get(0)
                        .getContents()
                        .get(0);

                for (Authenticator authenticator : user.getAuthenticators()) {
                    if (!authenticator.isDisabled() && authenticator instanceof PasswordAuthenticator) {
                        PasswordAuthenticator passwordAuthenticator = (PasswordAuthenticator) authenticator;
                        password = passwordAuthenticator.getPassword();
                        break;
                    }
                }
                //add user Roles from Roles
                for (Role userRole: user.getRoles()) {
                    au.add(new SimpleGrantedAuthority(userRole.getName()));
                }

                //add user Roles from Groups
                if (!user.getGroups().isEmpty()) {
                    for (Group userGroup: user.getGroups()) {
                        for (Role userRoleGroup: userGroup.getRoles()) {
                            au.add(new SimpleGrantedAuthority( userRoleGroup.getName() ));
                        }
                    }
                }

                int grant = context.getAuthorization().isResourcePermitted(context.getAuthorization().getAuthoritiesRoles(au), SYSTEM_DEVELOPER);
                GrantType developerGrant = Authorization.getGrantType(grant);
                UserDetails userDetails = new CurrentUser(userName, password, true, true, true, true,
                        au,
                        developerGrant == GrantType.WRITE);
                context.getAuthorization().log("login", userName);
                return userDetails;
            });
        } catch (Exception e) {
            throw new UsernameNotFoundException(e.getMessage());
        }
    }
}
