package com.example.demo.task;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Markdown task list items ("- [ ] Cover letter") in descriptions.
 * The frontend ticks a checkbox by sending the whole description with the changed items
 * (the clicked one, plus sub-items and parents that follow it); {@link #toggles} checks that
 * nothing but checkboxes changed and lists them.
 */
final class Checklists {

    // List marker (also inside block quotes), then "[ ]" or "[x]", then the item text.
    private static final Pattern ITEM = Pattern.compile("^((?:[ \\t]*>)*[ \\t]*(?:[-*+]|\\d{1,9}[.)])[ \\t]+\\[)([ xX])(].*)$");
    private static final int MAX_ITEM_LENGTH = 200;

    /** One ticked or unticked item; line is 0-based. */
    record Toggle(int line, String item, boolean checked) {
    }

    private Checklists() {
    }

    /**
     * The checkboxes that differ between the two texts, in line order. Empty if nothing changed
     * or anything other than a checkbox changed.
     */
    static List<Toggle> toggles(String before, String after) {
        if (before == null || after == null) {
            return List.of();
        }
        String[] oldLines = before.split("\n", -1);
        String[] newLines = after.split("\n", -1);
        if (oldLines.length != newLines.length) {
            return List.of();
        }
        List<Toggle> toggles = new ArrayList<>();
        for (int i = 0; i < oldLines.length; i++) {
            if (oldLines[i].equals(newLines[i])) {
                continue;
            }
            Optional<Toggle> toggle = toggle(i, oldLines[i], newLines[i]);
            if (toggle.isEmpty()) {
                return List.of();
            }
            toggles.add(toggle.get());
        }
        return toggles;
    }

    private static Optional<Toggle> toggle(int line, String before, String after) {
        Matcher was = ITEM.matcher(before);
        Matcher is = ITEM.matcher(after);
        if (!was.matches() || !is.matches()
                || !was.group(1).equals(is.group(1)) || !was.group(3).equals(is.group(3))) {
            return Optional.empty();
        }
        boolean checkedBefore = !was.group(2).equals(" ");
        boolean checkedAfter = !is.group(2).equals(" ");
        if (checkedBefore == checkedAfter) {
            return Optional.empty(); // only "x" -> "X"
        }
        return Optional.of(new Toggle(line, itemText(is.group(3)), checkedAfter));
    }

    private static String itemText(String rest) {
        String text = rest.substring(1).trim(); // without the "]"
        return text.length() > MAX_ITEM_LENGTH ? text.substring(0, MAX_ITEM_LENGTH) + "…" : text;
    }
}
