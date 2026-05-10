package com.interviewprep.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CategorizedQuestion {

    @JsonProperty("question")
    private String question;

    @JsonProperty("category")
    private String category;

    public CategorizedQuestion() {}

    public CategorizedQuestion(String question, String category) {
        this.question = question;
        this.category = category;
    }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
