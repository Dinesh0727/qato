package com.qato.qa_tool_orchaestrator;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.qato.utils", "com.qato.qa_tool_orchaestrator.controller", "com.qato.qa_tool_orchaestrator"})
public class QaToolOrchaestratorApplication {

	public static void main(String[] args) {
		SpringApplication.run(QaToolOrchaestratorApplication.class, args);
	}

}
