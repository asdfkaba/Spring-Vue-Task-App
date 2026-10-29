package com.example.demo.task;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Markdown task list items ("- [ ] Cover letter") in descriptions.
 * The frontend ticks a checkbox by sending the whole description with one item changed;
 * {@link #singleToggle} checks that nothing else changed and tells which item it was.
 */
final class Checklists {

    // List marker (also inside block quotes), then "[ ]" or "[x]", then the item text.
    private static final Pattern ITEM = Pattern.compile("^((?:[ \\t]*>)*[ \\t]*(?:[-*+]|\\d{1,9}[.)])[ \\t]+\\[)([ xX])(].*)$");
    private static final int MAX_ITEM_LENGTH = 200;

    record Toggle(String item, boolean checked) {
    }

    private Checklists() {
    }

    /** The one checkbox that differs between the two texts, or empty if anything else differs too. */
    static Optional<Toggle> singleToggle(String before, String after) {
        if (before == null || after == null) {
            return Optional.empty();
        }
        String[] oldLines = before.split("\n", -1);
        String[] newLines = after.split("\n", -1);
        if (oldLines.length != newLines.length) {
            return Optional.empty();
        }
        Toggle toggle = null;
        for (int i = 0; i < oldLines.length; i++) {
            if (oldLines[i].equals(newLines[i])) {
                continue;
            }
            if (toggle != null) {
                return Optional.empty();
            }
            Matcher was = ITEM.matcher(oldLines[i]);
            Matcher is = ITEM.matcher(newLines[i]);
            if (!was.matches() || !is.matches()
                    || !was.group(1).equals(is.group(1)) || !was.group(3).equals(is.group(3))) {
                return Optional.empty();
            }
            boolean checkedBefore = !was.group(2).equals(" ");
            boolean checkedAfter = !is.group(2).equals(" ");
            if (checkedBefore == checkedAfter) {
                return Optional.empty(); // only "x" -> "X"
            }
            toggle = new Toggle(itemText(is.group(3)), checkedAfter);
        }
        return Optional.ofNullable(toggle);
    }

    private static String itemText(String rest) {
        String text = rest.substring(1).trim(); // without the "]"
        return text.length() > MAX_ITEM_LENGTH ? text.substring(0, MAX_ITEM_LENGTH) + "…" : text;
    }
}
