<?php
/**
 * Comments Template
 */

if (post_password_required()) {
    return;
}
?>

<div id="comments" class="comments-area">
    <?php if (have_comments()) : ?>
        <h2 class="comments-title">
            <?php
            $comment_count = get_comments_number();
            printf(
                esc_html(_n('%s Comment', '%s Comments', $comment_count, 'darknet-theme')),
                number_format_i18n($comment_count)
            );
            ?>
        </h2>

        <ol class="comment-list">
            <?php
            wp_list_comments(array(
                'style'       => 'ol',
                'short_ping'  => true,
                'avatar_size' => 0, // No avatars for privacy
                'callback'    => 'darknet_comment_callback',
            ));
            ?>
        </ol>

        <?php if (get_comment_pages_count() > 1 && get_option('page_comments')) : ?>
            <nav class="pagination comment-navigation">
                <?php paginate_comments_links(array(
                    'prev_text' => '&laquo; Older',
                    'next_text' => 'Newer &raquo;',
                )); ?>
            </nav>
        <?php endif; ?>

    <?php endif; ?>

    <?php if (!comments_open() && get_comments_number() && post_type_supports(get_post_type(), 'comments')) : ?>
        <p class="no-comments text-muted">// Comments are closed.</p>
    <?php endif; ?>

    <?php
    comment_form(array(
        'title_reply'          => '> Leave a Comment',
        'title_reply_to'       => '> Reply to %s',
        'cancel_reply_link'    => '[ Cancel ]',
        'label_submit'         => 'Submit',
        'comment_notes_before' => '<p class="text-warning" style="font-size: 0.8rem; margin-bottom: 1rem;">WARNING: Do not post personal information. Your comment may be moderated.</p>',
        'comment_notes_after'  => '',
        'fields'               => array(
            'author' => '<p class="comment-form-author"><label for="author">Name (or Alias) *</label><input id="author" name="author" type="text" value="' . esc_attr($commenter['comment_author']) . '" required /></p>',
            'email'  => '<p class="comment-form-email"><label for="email">Email (not displayed) *</label><input id="email" name="email" type="email" value="' . esc_attr($commenter['comment_author_email']) . '" required /></p>',
            'url'    => '<p class="comment-form-url"><label for="url">Website (optional)</label><input id="url" name="url" type="url" value="' . esc_attr($commenter['comment_author_url']) . '" /></p>',
        ),
    ));
    ?>
</div>

<?php
/**
 * Custom comment callback for darknet styling
 */
function darknet_comment_callback($comment, $args, $depth) {
    $tag = ($args['style'] === 'div') ? 'div' : 'li';
    ?>
    <<?php echo $tag; ?> id="comment-<?php comment_ID(); ?>" <?php comment_class(empty($args['has_children']) ? '' : 'parent'); ?>>
        <article class="comment-body">
            <div class="comment-meta">
                <span class="comment-author"><?php echo get_comment_author(); ?></span>
                <span class="text-muted"> :: </span>
                <time datetime="<?php comment_time('c'); ?>">
                    <?php printf('%1$s @ %2$s', get_comment_date('Y-m-d'), get_comment_time('H:i')); ?>
                </time>
            </div>

            <?php if ($comment->comment_approved == '0') : ?>
                <p class="comment-awaiting-moderation text-warning" style="font-size: 0.8rem;">
                    // Comment awaiting moderation
                </p>
            <?php endif; ?>

            <div class="comment-content">
                <?php comment_text(); ?>
            </div>

            <div class="comment-actions" style="margin-top: 0.5rem;">
                <?php
                comment_reply_link(array_merge($args, array(
                    'depth'     => $depth,
                    'max_depth' => $args['max_depth'],
                    'before'    => '<span class="reply">',
                    'after'     => '</span>',
                )));
                ?>
                <?php edit_comment_link('[ Edit ]', ' <span class="edit-link">', '</span>'); ?>
            </div>
        </article>
    <?php
}
