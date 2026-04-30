package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "accounts")
public class Account {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(length = 500)
    private String logoUrl;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<Role> roles = new ArrayList<>();

    public UUID getId()               { return id; }
    public void setId(UUID id)        { this.id = id; }
    public String getName()           { return name; }
    public void setName(String v)     { this.name = v; }
    public String getLogoUrl()        { return logoUrl; }
    public void setLogoUrl(String v)  { this.logoUrl = v; }
    public List<Role> getRoles()      { return roles; }
    public void setRoles(List<Role> v){ this.roles = v; }
}
