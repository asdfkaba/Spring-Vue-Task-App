package com.example.demo.task;

import com.example.demo.task.Checklists.Toggle;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ChecklistsTests {

    private static final String LIST = """
            Steps:
            - [ ] Cover letter
            - [x] CV
              * [ ] Nested item
            1. [ ] Numbered
            > - [ ] Quoted""";

    @Test
    void tickingOneItemIsFoundWithItsText() {
        String after = LIST.replace("- [ ] Cover letter", "- [x] Cover letter");
        assertThat(Checklists.singleToggle(LIST, after)).contains(new Toggle("Cover letter", true));
    }

    @Test
    void untickingAndOtherListStyles() {
        assertThat(Checklists.singleToggle(LIST, LIST.replace("- [x] CV", "- [ ] CV")))
                .contains(new Toggle("CV", false));
        assertThat(Checklists.singleToggle(LIST, LIST.replace("* [ ] Nested", "* [X] Nested")))
                .contains(new Toggle("Nested item", true));
        assertThat(Checklists.singleToggle(LIST, LIST.replace("1. [ ] Numbered", "1. [x] Numbered")))
                .contains(new Toggle("Numbered", true));
        assertThat(Checklists.singleToggle(LIST, LIST.replace("> - [ ] Quoted", "> - [x] Quoted")))
                .contains(new Toggle("Quoted", true));
    }

    @Test
    void anyOtherChangeIsRejected() {
        String ticked = LIST.replace("- [ ] Cover letter", "- [x] Cover letter");
        // Two items
        assertThat(Checklists.singleToggle(LIST, ticked.replace("1. [ ] Numbered", "1. [x] Numbered"))).isEmpty();
        // Item text changed as well
        assertThat(Checklists.singleToggle(LIST, LIST.replace("- [ ] Cover letter", "- [x] Cover"))).isEmpty();
        // Not a checkbox line
        assertThat(Checklists.singleToggle(LIST, LIST.replace("Steps:", "Steps"))).isEmpty();
        // Line added
        assertThat(Checklists.singleToggle(LIST, ticked + "\n")).isEmpty();
        // Nothing changed, or only the case of the x
        assertThat(Checklists.singleToggle(LIST, LIST)).isEmpty();
        assertThat(Checklists.singleToggle(LIST, LIST.replace("- [x] CV", "- [X] CV"))).isEmpty();
        // No description
        assertThat(Checklists.singleToggle(null, LIST)).isEmpty();
        assertThat(Checklists.singleToggle(LIST, null)).isEmpty();
    }

    @Test
    void textThatOnlyLooksLikeABoxIsNotAnItem() {
        String text = "Use [ ] for empty boxes";
        assertThat(Checklists.singleToggle(text, "Use [x] for empty boxes")).isEmpty();
    }

    @Test
    void longItemTextIsShortened() {
        String before = "- [ ] " + "a".repeat(300);
        Toggle toggle = Checklists.singleToggle(before, before.replace("[ ]", "[x]")).orElseThrow();
        assertThat(toggle.item()).hasSize(201).endsWith("…");
    }
}
