package com.interviewprep.domain;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "roles")
public class Role {

    @Id @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id")
    private Account account;

    public UUID getId()                { return id; }
    public void setId(UUID id)         { this.id = id; }
    public String getName()            { return name; }
    public void setName(String v)      { this.name = v; }
    public Account getAccount()        { return account; }
    public void setAccount(Account v)  { this.account = v; }
}
