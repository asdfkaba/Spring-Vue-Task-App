package com.example.demo.board;

import com.example.demo.board.BoardDtos.ShareDto;
import com.example.demo.board.BoardDtos.SharedBoard;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
public class BoardShareController {

    private final BoardShareService shareService;

    public BoardShareController(BoardShareService shareService) {
        this.shareService = shareService;
    }

    // 204 when the board isn't shared.
    @GetMapping("/boards/{id}/share")
    public ResponseEntity<ShareDto> getShare(@PathVariable("id") int boardId) {
        return shareService.getShare(boardId, currentUserEmail())
                .map(share -> ResponseEntity.ok(ShareDto.from(share)))
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/boards/{id}/share")
    @ResponseStatus(HttpStatus.CREATED)
    public ShareDto createShare(@PathVariable("id") int boardId) {
        return ShareDto.from(shareService.createShare(boardId, currentUserEmail()));
    }

    @DeleteMapping("/boards/{id}/share")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeShare(@PathVariable("id") int boardId) {
        shareService.revokeShare(boardId, currentUserEmail());
    }

    // Public: no login needed (see WebSecurityConfig).
    // path: "<slug>-<key>" or, for older links, the plain token (see ShareLinks).
    @GetMapping("/share/{path}")
    public SharedBoard getSharedBoard(@PathVariable("path") String path) {
        return shareService.sharedBoard(path);
    }

    private static String currentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
